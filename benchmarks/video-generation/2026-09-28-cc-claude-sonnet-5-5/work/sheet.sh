#!/bin/bash
o=$1; shift
ffmpeg -y -loglevel error -i shots/t$1.png -i shots/t$2.png -i shots/t$3.png -i shots/t$4.png -filter_complex "[0]scale=800:450[a];[1]scale=800:450[b];[2]scale=800:450[c];[3]scale=800:450[d];[a][b][c][d]xstack=inputs=4:layout=0_0|800_0|0_450|800_450" shots/$o
