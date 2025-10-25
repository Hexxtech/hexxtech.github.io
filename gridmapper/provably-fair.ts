export type RNGOptions = {
  serverSeed: string;
  clientSeed: string;
  nonce: number;
};

export async function* bytesGenerator({ serverSeed, clientSeed, nonce }: RNGOptions): AsyncGenerator<number, never, void> {
  let currentRound = 0;
  const encoder = new TextEncoder();
  const keyData = encoder.encode(serverSeed);
  const key = await window.crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  while (true) {
    const message = `${clientSeed}:${nonce}:${currentRound}`;
    const messageData = encoder.encode(message);

    const signature = await window.crypto.subtle.sign(
      'HMAC',
      key,
      messageData
    );
    
    const buffer = new Uint8Array(signature);

    for (const byte of buffer) {
      yield byte;
    }

    currentRound += 1;
  }
}

export async function* floatsGenerator(options: RNGOptions): AsyncGenerator<number, never, void> {
  const byteRng = bytesGenerator(options);

  while (true) {
    const bytes: number[] = [];
    for (let i = 0; i < 4; i++) {
        const nextByte = await byteRng.next();
        bytes.push(nextByte.value);
    }

    const float = bytes.reduce((result, value, i) => {
      const divider = 256 ** (i + 1);
      const partialResult = value / divider;

      return result + partialResult;
    }, 0);

    yield float;
  }
}