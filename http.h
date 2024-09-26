#ifndef HTTP_H
#define HTTP_H

void error(const char *msg);
void generateUID(char *uid, int length);
void handleGetRequest(int sockfd, const char *request);
int handlePostRequest(int sockfd, const char *request);

#endif
