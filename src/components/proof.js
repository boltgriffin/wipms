export const MAX_BYTES = 3 * 1024 * 1024;

const readBase64 = (blob) => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(String(r.result).split(',')[1]);
  r.onerror = () => rej(new Error('The file could not be read'));
  r.readAsDataURL(blob);
});

// Photos are shrunk in the browser (max 1600 px, JPEG) so phone pictures fit the 3 MB limit. PDFs are sent as they are.
export async function prepareProof(file) {
  if (file.type === 'application/pdf') {
    if (file.size > MAX_BYTES) throw new Error('The PDF must be under 3 MB');
    return { name: file.name, mimeType: file.type, data: await readBase64(file) };
  }
  if (file.type !== 'image/jpeg' && file.type !== 'image/png') throw new Error('Attach a JPG, PNG or PDF file');
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale); canvas.height = Math.round(bmp.height * scale);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  const data = canvas.toDataURL('image/jpeg', 0.82).split(',')[1];
  if (data.length * 0.75 > MAX_BYTES) throw new Error('The photo is too large even after shrinking. Try a smaller picture.');
  return { name: file.name.replace(/\.[^.]*$/, '') + '.jpg', mimeType: 'image/jpeg', data };
}
