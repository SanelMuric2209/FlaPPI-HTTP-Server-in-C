#ifndef USER_H
#define USER_H

#include <time.h>
#include "config.h"

typedef struct {
    char username[NAME_LENGTH + 1];
    time_t firstLogin;
    char uid[COOKIE_LENGTH + 1];
    int score;
} User;

int exists(const char* uid);
void create(const char* uid, const char* username);
void updateScore(const char* uid, int score);
void updateName(const char* uid, const char* username);
void getAllScoresAsJSON(char* buffer);
void clearAll();

#endif
