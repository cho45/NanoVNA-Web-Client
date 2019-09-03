#include <stdio.h>
#include <time.h>

int main(int argc, char **argv) {
    time_t rawtime;
    time(&rawtime);
    struct tm *info = localtime(&rawtime);
    char displayTime[100];
    strftime(displayTime , 100, "%c", info);
    printf("%%c in the current locale: %s\n", displayTime);
    return 0;
}
