#include "user.h"
#include "config.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

User *users = NULL;
int userCount = 0;

int exists(const char* uid) {
    for (int i = 0; i < userCount; i++) {
        if (strcmp(users[i].uid, uid) == 0) {
            return 1;
        }
    }
    return 0;
}

void create(const char* uid, const char* username) {
    if (exists(uid)) {
        printf("User with UID %s already exists.\n", uid);
        return;
    }

    // Allocate memory for new user
    users = realloc(users, (userCount + 1) * sizeof(User));
    if (!users) {
        perror("Failed to reallocate memory for users");
        exit(EXIT_FAILURE);
    }

    // Create new user and add to array
    strncpy(users[userCount].username, username, NAME_LENGTH);
    users[userCount].username[NAME_LENGTH] = '\0'; // Ensure null-termination
    users[userCount].firstLogin = time(NULL);
    strncpy(users[userCount].uid, uid, COOKIE_LENGTH);
    users[userCount].uid[COOKIE_LENGTH] = '\0'; // Ensure null-termination
    users[userCount].score = 0; // Default score

    userCount++;
    printf("User with UID %s created.\n", uid);
}

void updateScore(const char* uid, int score) {
    // Only update if score is new best
    for (int i = 0; i < userCount; i++) {
        if (strcmp(users[i].uid, uid) == 0) {
            if (score < users[i].score) return; // Don't allow score to decrease
            users[i].score = score;
            printf("User with UID %s updated score.\n", uid);
            return;
        }
    }
    printf("User with UID %s not found.\n", uid);
}

void updateName(const char* uid, const char* username) {
    for (int i = 0; i < userCount; i++) {
        if (strcmp(users[i].uid, uid) == 0) {
            strncpy(users[i].username, username, NAME_LENGTH);
            users[i].username[NAME_LENGTH] = '\0'; // Ensure null-termination
            printf("User with UID %s updated name.\n", uid);
            return;
        }
    }
    printf("User with UID %s not found.\n", uid);
}

// A: qsort expects a function that takes two void pointers as arguments
int compareUsers(const void * a, const void * b) {
    User *userA = (User *)a;
    User *userB = (User *)b;

    // Primary comparison based on score
    int scoreComparison = userB->score - userA->score;
    if (scoreComparison != 0) {
        // If scores are different, return the result of this comparison
        return scoreComparison;
    } else {
        // If scores are the same, compare based on username
        return strcmp(userA->username, userB->username);
    }
}

void getAllScoresAsJSON(char * buffer) {
    // standard quicksort, takes an array, number of elements, size of each element, and a function pointer to a comparison function
    qsort(users, userCount, sizeof(User), compareUsers);

    // Creates JSON (JavaScript Object Notation) string of all users, that can be easily parsed by the client
    char * ptr = buffer;
    ptr += sprintf(ptr, "[");
    for (int i = 0; i < userCount; i++) {
        ptr += sprintf(ptr, "{\"uid\":\"%s\",\"username\":\"%s\",\"score\":%d}", users[i].uid, users[i].username, users[i].score);
        if (i < userCount - 1) {
            ptr += sprintf(ptr, ",");
        }
    }
    ptr += sprintf(ptr, "]");
}

void clearAll() {
    free(users);
    users = NULL;
    userCount = 0;
}
