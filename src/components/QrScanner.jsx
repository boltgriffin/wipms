import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';

export default function QrScanner({ onDetect, onClose }) {
  const video = useRef(null);
  const done = useRef(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let stream, timer;
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) return setError('Camera is not available here. Use HTTPS, or open the QR link with your phone camera.');
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        video.current.srcObject = stream;
        await video.current.play();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        timer = setInterval(() => {
          const v = video.current;
          if (done.current || !v || v.readyState < 2) return;
          const scale = Math.min(1, 640 / v.videoWidth);
          canvas.width = v.videoWidth * scale; canvas.height = v.videoHeight * scale;
          ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
          const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
          if (code?.data) { done.current = true; onDetect(code.data); } // fires once: no repeated submissions
        }, 250);
      } catch (e) {
        setError(e.name === 'NotAllowedError'
          ? 'Camera permission was denied. Allow camera access in your browser settings, or open the QR link with your phone camera app.'
          : 'No camera was found on this device. Open the QR link with another device, or ask your teacher.');
      }
    })();
    return () => { clearInterval(timer); stream?.getTracks().forEach((t) => t.stop()); };
  }, [onDetect]);

  return (
    <div>
      {error ? <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p> : (
        <>
          <video ref={video} playsInline muted className="aspect-square w-full rounded bg-black object-cover" />
          <p className="mt-2 text-sm text-forest-700">Point the camera at the attendance QR code.</p>
        </>
      )}
      <button onClick={onClose} className="mt-3 w-full rounded border border-forest-800 py-2 font-semibold">Cancel</button>
    </div>
  );
}
