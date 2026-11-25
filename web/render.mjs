import { execFile } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';

const ffmpeg = promisify(execFile);
const encode = ['-c:v', 'libx264', '-threads', '2', '-preset', 'fast', '-crf', '21',
  '-pix_fmt', 'yuv420p', '-movflags', '+faststart'];

export async function renderVideos(directory, images) {
  const run = (...args) => ffmpeg('ffmpeg', [
    '-nostdin', '-hide_banner', '-loglevel', 'error', '-y', '-filter_threads', '2',
    ...args,
  ], { cwd: directory, timeout: 35_000 });

  const segments = [];
  for (const [index, image] of images.entries()) {
    const filename = `photo-${index}.${image.extension}`;
    const segment = `scene-${index}.mp4`;
    await writeFile(`${directory}/${filename}`, image.data);
    await run('-threads', '2', '-max_pixels', '30000000', '-f', 'image2',
      '-c:v', image.decoder, '-i', filename, '-map', '0:v:0', '-an', '-map_metadata', '-1',
      '-vf', 'scale=720:1280:force_original_aspect_ratio=decrease:force_divisible_by=2,setsar=1,' +
        'pad=720:1280:(ow-iw)/2:(oh-ih)/2:0x17100d,' +
        "zoompan=z='1+on*0.0007':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=72:s=720x1280:fps=24," +
        'fade=t=in:d=0.16,fade=t=out:st=2.82:d=0.18',
      '-frames:v', '72', ...encode, segment);
    segments.push(segment);
  }
  await writeFile(`${directory}/scenes.txt`, segments.map(name => `file '${name}'\n`).join(''));
  await run('-f', 'concat', '-safe', '1', '-i', 'scenes.txt', '-c', 'copy',
    '-movflags', '+faststart', 'video.mp4');
  await run('-i', 'video.mp4', '-vf',
    "scale=360:640,drawtext=text=VIDOO:fontsize=42:fontcolor=white@0.8:box=1:boxcolor=black@0.4:boxborderw=12:x=(w-tw)/2:y=(h-th)/2",
    ...encode, 'preview.mp4');
}
