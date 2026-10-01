export function wordsOf(text: string): string[] {
  return text.trim().split(/\s+/).filter((w) => w.length > 0);
}

export function splitWords(el: HTMLElement): HTMLElement[] {
  const words = wordsOf(el.textContent ?? '');
  const nodes: Node[] = [];
  const spans: HTMLElement[] = [];

  words.forEach((word, i) => {
    if (i > 0) nodes.push(document.createTextNode(' '));
    const span = document.createElement('span');
    span.textContent = word;
    span.style.display = 'inline-block';
    nodes.push(span);
    spans.push(span);
  });

  el.replaceChildren(...nodes);
  return spans;
}
