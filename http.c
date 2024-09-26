
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <limits.h>
#include <time.h>
#include <errno.h>
#include <sys/socket.h>
#include <sys/types.h>
#include "config.h"
#include "user.h"

void error(const char *msg) {
    perror(msg); // prints "errno" which is saved internally, i.e. "No such file or directory"
    exit(1);
}

void generateUID(char *uid, int length) {
    const char * charset = "abcdefghijklmnopqrstuvwxyz";
    int charsetSize = strlen(charset);

    for (int i = 0; i < length; i++) {
        int key = rand() % charsetSize;
        uid[i] = charset[key];
    }

    uid[length] = '\0';
}

void handleGetRequest(int sockfd, const char *request) {
    char pathBuffer[PATH_MAX];
    char *pathStart = strchr(request, ' ');
    if (!pathStart) {
        write(sockfd, "HTTP/1.1 400 BAD REQUEST\n\n", 26);
        return;
    }
    pathStart++;

    char *pathEnd = strchr(pathStart, ' ');
    if (!pathEnd) {
        write(sockfd, "HTTP/1.1 400 BAD REQUEST\n\n", 26);
        return;
    }

    int pathLength = pathEnd - pathStart;
    if (pathLength <= 0 || pathLength >= PATH_MAX) {
        write(sockfd, "HTTP/1.1 414 URI TOO LONG\n\n", 28);
        return;
    }

    strncpy(pathBuffer, pathStart, pathLength);
    pathBuffer[pathLength] = '\0';

    if (strcmp(pathBuffer, "/") == 0) {
        strcpy(pathBuffer, "/index.html");
    }

    char fullPath[PATH_MAX+strlen(BASE_DIR)+1];
    snprintf(fullPath, sizeof(fullPath), "%s%s", BASE_DIR, pathBuffer);

    char resolvedPath[PATH_MAX];

    if (realpath(fullPath, resolvedPath) == NULL) {
        write(sockfd, "HTTP/1.1 404 NOT FOUND\n\n", 24);
        return;
    }

    if (strstr(resolvedPath, "..")) {
        write(sockfd, "HTTP/1.1 403 FORBIDDEN\n\n", 25);
        return;
    }

    FILE *file = fopen(resolvedPath, "r");
    if (!file) {
        write(sockfd, "HTTP/1.1 404 NOT FOUND\n\n", 24);
        return;
    }

    const char *mimeType = "text/html";
    char *extension = strrchr(resolvedPath, '.');
    if (extension) {
        // simplified MIME type detection
        mimeType = (!strcmp(extension, ".css")) ? "text/css" :
                   (!strcmp(extension, ".js"))  ? "text/javascript" :
                   (!strcmp(extension, ".png")) ? "image/png" :
                   (!strcmp(extension, ".ico")) ? "image/x-icon" :
                   (!strcmp(extension, ".svg")) ? "image/svg+xml" :
                   (!strcmp(extension, ".jpg")) ? "image/jpeg" :
                   (!strcmp(extension, ".gif")) ? "image/gif" : "text/html";
    }

    char responseHeader[1024];
    int isNewConnection = strstr(request, "cookie: UID=") == NULL;
    if (isNewConnection) {
        char uid[COOKIE_LENGTH];
        generateUID(uid, COOKIE_LENGTH);

        snprintf(responseHeader, sizeof(responseHeader),
                 "HTTP/1.1 200 OK\n"
                 "Set-Cookie: UID=%s; HttpOnly; Path=/\n"
                 "Content-Type: %s\n\n",
                 uid, mimeType);
    } else {
        snprintf(responseHeader, sizeof(responseHeader),
                 "HTTP/1.1 200 OK\n"
                 "Content-Type: %s\n\n",
                 mimeType);
    }

    write(sockfd, responseHeader, strlen(responseHeader));

    char buffer[1024];
    size_t bytesRead;
    while ((bytesRead = fread(buffer, 1, sizeof(buffer), file)) > 0) {
        write(sockfd, buffer, bytesRead);
    }

    fclose(file);
}

int handlePostRequest(int sockfd, const char *request) {
    if (strncmp(request, "POST /api/name ", 15) == 0) {
        // Extract the Cookie
        printf("POST /api/name\n");
        printf("request: %s\n", request);

        char *cookieHeader = strstr(request, "cookie: ");
        char *nameHeader = strstr(request, "username: ");
        char cookieValue[COOKIE_LENGTH+1];
        char nameValue[NAME_LENGTH+1];
        if (cookieHeader && nameHeader) {
            char formatString[20];
            sprintf(formatString, "cookie: UID=%%%ds", COOKIE_LENGTH); // becomes "Cookie: UID=%20s"
            sscanf(cookieHeader, formatString, cookieValue);
            sscanf(nameHeader, "username: %s", nameValue);
        }

        if (exists(cookieValue)) {
            updateName(cookieValue, nameValue);
        } else {
            create(cookieValue, nameValue); // dangerous cause the user can choose any cookie value and we save it
        }

        if (cookieValue[0] != '\0') {
            char responseHeader[100];
            sprintf(responseHeader, "HTTP/1.1 200 OK\nContent-Type: text/html\ncolor: %c\n\n", cookieValue[0]);
            write(sockfd, responseHeader, strlen(responseHeader));
        } else {
            const char *response = "HTTP/1.1 200 OK\nContent-Type: text/html\n\n";
            write(sockfd, response, strlen(response));
        }

        return 1;
    }

    if (strncmp(request, "POST /api/score ", 16) == 0) {
        // Extract the Cookie
        char *cookieHeader = strstr(request, "cookie: ");
        char *scoreHeader = strstr(request, "score: ");
        char cookieValue[COOKIE_LENGTH+1];
        int scoreValue = 0;
        if (cookieHeader && scoreHeader) {
            char formatString[20];
            sprintf(formatString, "cookie: UID=%%%ds", COOKIE_LENGTH); // becomes "Cookie: UID=%20s"
            sscanf(cookieHeader, formatString, cookieValue);
            sscanf(scoreHeader, "score: %d", &scoreValue);
        }

        if (exists(cookieValue)) {
            updateScore(cookieValue, scoreValue);
        } else {
            printf("Score for unknown user?\n");
        }

        const char *response = "HTTP/1.1 200 OK\nContent-Type: text/html\n\n";
        int worked = write(sockfd, response, strlen(response));
        if (worked < 0) {
            printf("Error writing to socket: %s\n", strerror(errno));
        }
        return 1;
    }

    if (strncmp(request, "POST /api/players ", 18) == 0) {
        // printf("POST /api/players\n");

        char * players; // declaring to NULL gets seg fault, should allocate memory instead
        getAllScoresAsJSON(players);
        // printf("players: %s\n", players);

        const char *response = "HTTP/1.1 200 OK\nContent-Type: application/json\n\n";
        int worked = write(sockfd, response, strlen(response));
        if (worked < 0) printf("Error writing to socket: %s\n", strerror(errno));
        int worked2 = write(sockfd, players, strlen(players));
        if (worked2 < 0) printf("Error writing to socket: %s\n", strerror(errno));
        return 1;
    }

    return 0;
}
