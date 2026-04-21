export function normalizeDocumentImage(image: unknown) {
  if (typeof image !== 'string') {
    return null;
  }

  const normalized = image.trim();
  return normalized ? normalized : null;
}

export function isEmbeddedDocumentImage(image: string | null | undefined) {
  return typeof image === 'string' && /^data:image\/[a-z0-9.+-]+;base64,/i.test(image);
}
