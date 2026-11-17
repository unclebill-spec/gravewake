# usage: lufs file gain
ffmpeg -nostats -hide_banner -f lavfi -i "anullsrc=r=44100:cl=mono:d=1" -i "$1" -filter_complex "[1:a]aresample=44100,aformat=channel_layouts=mono,volume=$2[a];[0:a][a][0:a]concat=n=3:v=0:a=1,ebur128=peak=true" -f null - 2>&1 | grep -A1 "Integrated loudness" | grep -o "I: *[-0-9.]*" | awk '{print $2}'
