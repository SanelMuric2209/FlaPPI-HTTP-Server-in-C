# Basic HTTP Server

This project demonstrates a very basic HTTP server that serves static files from a directory. It's designed to illustrate the fundamentals of how HTTP works, including handling cookies and POST requests for scores to a specific endpoint. This server is not intended for production use due to its lack of security and performance optimizations.

## Features

- **Serving Static Files**: Can serve files from a specified directory.
- **Cookie Management**: Assigns cookies to clients if they don't already have one.
- **Score Submission**: Clients can POST their scores to `/api/score`.

## Warning

This server is not secure or fast. It's meant for educational purposes to demonstrate basic HTTP server functionality. Future plans include using Cloudflare and a server in Frankfurt to run a simple game, but this setup is still not recommended for production environments.

## Dependencies

The server is written in C and uses only standard C libraries, ensuring broad compatibility and ease of compilation.

## Compilation

To compile the server, you will need a C compiler like `gcc` or `clang`. Use the following command or just execute the compile.sh File:

```bash
gcc main.c user.c http.c -o serv
