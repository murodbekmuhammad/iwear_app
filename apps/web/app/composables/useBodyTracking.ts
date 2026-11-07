import type { PoseLandmarker } from '@mediapipe/tasks-vision';
import type { BodyPoints, Point } from '~/utils/garmentFit';

// Google's hosted pose model (about 6 MB, cached by the browser after the first visit).
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

// MediaPipe pose landmark numbers.
const LEFT_SHOULDER = 11;
const RIGHT_SHOULDER = 12;
const LEFT_HIP = 23;
const RIGHT_HIP = 24;
const MIN_VISIBILITY = 0.5;

export type TrackingState = 'off' | 'loading' | 'searching' | 'tracking' | 'failed';

/**
 * Finds the shopper's shoulders and hips in the camera video, in the browser, many times a second.
 * Points are converted to stage pixels: the video is shown mirrored and cropped to cover the stage.
 */
export function useBodyTracking(video: Ref<HTMLVideoElement | null>, stage: Ref<HTMLElement | null>, onBody: (body: BodyPoints | null) => void) {
  const state = ref<TrackingState>('off');
  let landmarker: PoseLandmarker | null = null;
  let frame = 0;
  let lastVideoTime = -1;
  let stopped = false;

  async function start() {
    if (landmarker || state.value === 'loading') return;
    stopped = false;
    state.value = 'loading';
    try {
      const { FilesetResolver, PoseLandmarker } = await import('@mediapipe/tasks-vision');
      const files = await FilesetResolver.forVisionTasks(`${useRuntimeConfig().app.baseURL}mediapipe`);
      const create = (delegate: 'GPU' | 'CPU') =>
        PoseLandmarker.createFromOptions(files, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate },
          runningMode: 'VIDEO',
          numPoses: 1,
        });
      landmarker = await create('GPU').catch(() => create('CPU'));
      if (stopped) {
        landmarker.close();
        landmarker = null;
        return;
      }
      state.value = 'searching';
      loop();
    } catch (error) {
      console.warn('Body tracking is not available', error);
      state.value = 'failed';
    }
  }

  function toStage(x: number, y: number, el: HTMLVideoElement, box: DOMRect): Point {
    const scale = Math.max(box.width / el.videoWidth, box.height / el.videoHeight);
    const offsetX = (box.width - el.videoWidth * scale) / 2;
    const offsetY = (box.height - el.videoHeight * scale) / 2;
    // Mirrored, like the video on screen.
    return { x: box.width - (offsetX + x * el.videoWidth * scale), y: offsetY + y * el.videoHeight * scale };
  }

  function loop() {
    if (stopped || !landmarker) return;
    frame = requestAnimationFrame(loop);
    const el = video.value;
    const box = stage.value?.getBoundingClientRect();
    if (!el || !box || el.readyState < 2 || !el.videoWidth || el.currentTime === lastVideoTime) return;
    lastVideoTime = el.currentTime;
    const result = landmarker.detectForVideo(el, performance.now());
    const points = result.landmarks[0];
    const seen = (i: number) => (points?.[i]?.visibility ?? 0) >= MIN_VISIBILITY;
    if (!points || !seen(LEFT_SHOULDER) || !seen(RIGHT_SHOULDER)) {
      state.value = 'searching';
      onBody(null);
      return;
    }
    const at = (i: number) => toStage(points[i]!.x, points[i]!.y, el, box);
    const hipsSeen = seen(LEFT_HIP) && seen(RIGHT_HIP);
    state.value = 'tracking';
    onBody({
      leftShoulder: at(LEFT_SHOULDER),
      rightShoulder: at(RIGHT_SHOULDER),
      leftHip: hipsSeen ? at(LEFT_HIP) : null,
      rightHip: hipsSeen ? at(RIGHT_HIP) : null,
    });
  }

  function stop() {
    stopped = true;
    cancelAnimationFrame(frame);
    landmarker?.close();
    landmarker = null;
    if (state.value !== 'failed') state.value = 'off';
  }

  onBeforeUnmount(stop);
  return { state, start, stop };
}
