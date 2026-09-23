#!/bin/zsh
# usage: render-film.sh <name> <width> <height> <fps> [chunk frames] [seed]
# Renders the film in chunks of raw yuv420p (each inside a fresh-enough browser session),
# encodes each chunk in the background as soon as it lands (so raw frames never pile up on disk), then joins them.
# CRF (default 16) sets the encode quality.
cd "${0:a:h}"
NAME=$1 W=$2 H=$3 FPS=$4 CHUNK=${5:-600} SEED=${6:-7} CRF=${CRF:-16}
# CODEC overrides the encoder, e.g. CODEC='-c:v h264_videotoolbox -b:v 160M' to keep the CPU free for rendering
CODEC=${CODEC:-"-c:v libx264 -preset slow -crf $CRF -tune grain -profile:v high"}
TOTAL=$(( 45 * FPS ))
FRAME=$(( W * H * 3 / 2 ))
SEGS=()
for (( FROM=0; FROM<TOTAL; FROM+=CHUNK )); do
  TO=$(( FROM + CHUNK > TOTAL ? TOTAL : FROM + CHUNK ))
  SEG=$(printf "%s-%05d" $NAME $FROM)
  SEGS+=(out/segs/$SEG.mp4)
  if [[ -f out/segs/$SEG.mp4 ]]; then echo "skip $SEG"; continue; fi
  for attempt in 1 2 3; do
    MIN_LEFT=900 ./session.sh > out/session.last
    grep NEW out/session.last
    ./go.sh "mode=video&name=$SEG&w=$W&h=$H&fps=$FPS&from=$FROM&to=$TO&seed=$SEED&yuv=1" 2
    SIZE=$(stat -f %z out/segs/$SEG.yuv 2>/dev/null || echo 0)
    if [[ "$SIZE" == "$(( (TO - FROM) * FRAME ))" ]]; then echo "ok $SEG"; break; fi
    echo "retry $SEG (size $SIZE)"
  done
  [[ "$SIZE" == "$(( (TO - FROM) * FRAME ))" ]] || { echo "failed $SEG"; wait; exit 1; }
  { ffmpeg -v error -y -f rawvideo -pix_fmt yuv420p -s ${W}x${H} -r $FPS \
    -color_range tv -colorspace bt709 -color_primaries bt709 -color_trc bt709 -i out/segs/$SEG.yuv \
    ${=CODEC} -pix_fmt yuv420p \
    -color_range tv -colorspace bt709 -color_primaries bt709 -color_trc bt709 out/segs/$SEG.part.mp4 \
    && mv out/segs/$SEG.part.mp4 out/segs/$SEG.mp4 && rm out/segs/$SEG.yuv && echo "encoded $SEG"; } &
done
wait
printf "file '%s'\n" ${SEGS:a} > out/segs/$NAME.txt
ffmpeg -v error -y -f concat -safe 0 -i out/segs/$NAME.txt -c copy -movflags +faststart out/$NAME.mp4 \
  && rm $SEGS out/segs/$NAME.txt && echo "encoded out/$NAME.mp4"
