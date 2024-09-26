/*
    This is a very basic HTTP server that serves static files from a directory.
    It is not secure, and it is not fast. It is only meant to demonstrate the basics of how HTTP works.

    If clients don't have a cookie, it will send them a cookie.
    Using the cookie, clients can POST their score to /api/score

    wooooooo

    later we will silently use cloudflare and a cheap server in frankfurt
    to run our little flappy bird game

    only standard C libs were used
*/

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/types.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <fcntl.h> // for open
#include <sys/stat.h> // for stat
#include <limits.h> // For PATH_MAX
#include <errno.h>  // For errno
#include <time.h>

#include "config.h"
#include "user.h"
#include "http.h"

int main(int argc, char *argv[]) {
    printf("Starting HTTP Server\n");
    srand(time(NULL)); // seed
    int sockfd, newsockfd, portno;
    socklen_t clilen;
    char request[1024];
    struct sockaddr_in serv_addr, cli_addr;

    if (argc < 2) {
        fprintf(stderr,"ERROR, no port provided\n");
        exit(1);
    }

    // sockfd is a "socket file descriptor", an integer to identify the socket
    // AF_INET is the address family (IPv4)
    // SOCK_STREAM means it's a TCP socket (SOCK_DGRAM would mean it's a UDP socket which is faster but less reliable)
    sockfd = socket(AF_INET, SOCK_STREAM, 0);
    if (sockfd < 0)
        error("ERROR opening socket");

    int yes = 1;
    // Set SO_REUSEADDR to allow immediate reuse of this port, otherwise we have to wait for the OS to release it (bad)
    if (setsockopt(sockfd, SOL_SOCKET, SO_REUSEADDR, &yes, sizeof(yes)) < 0) {
        error("ERROR on setting SO_REUSEADDR");
    }

    // bzero sets all values in a buffer to zero
    bzero((char *) &serv_addr, sizeof(serv_addr));
    // ports are like doors to the internet, and each door can be opened or closed
    // portno is the number of the door we want to open, if below 1024 it requires root access!
    // 80 is the standard HTTP port, 443 is the standard HTTPS port, 8080 is what developers love
    portno = atoi(argv[1]);

    serv_addr.sin_family = AF_INET;
    serv_addr.sin_addr.s_addr = INADDR_ANY;
    serv_addr.sin_port = htons(portno);

    if (bind(sockfd, (struct sockaddr *) &serv_addr, sizeof(serv_addr)) < 0)
        error("ERROR on binding");

    listen(sockfd, 5); // up to 5 backlogged connections, the OS will queue them for us
    clilen = sizeof(cli_addr);

    printf("Listening on port %d\n", portno);

    // Loop forever, accepting connections, forever!
    while (1) {
        newsockfd = accept(sockfd, (struct sockaddr *) &cli_addr, &clilen);
        //fcntl(newsockfd, F_SETFL, O_NONBLOCK);
        if (newsockfd < 0) error("ERROR on accept");

        bzero(request, 1024);
        int n = read(newsockfd, request, 1023);
        if (n < 0) error("ERROR reading from socket");
        if (DEBUG) printf("\nReceived HTTP request:\n%s\n", request);

        if (strncmp(request, "POST", 4) == 0) {
            handlePostRequest(newsockfd, request);
        }

        if (strncmp(request, "GET", 3) == 0) {
            handleGetRequest(newsockfd, request);
        }

        close(newsockfd);
    }

    close(sockfd);
    return 0;
}