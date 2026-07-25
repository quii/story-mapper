export function buildPrompt(productDescription: string, releaseCount: number): string {
  const releaseLines = Array.from({ length: releaseCount }, (_, i) => `release: <name> @ ${i + 1}`).join('\n');
  const releaseExample = Array.from({ length: releaseCount }, (_, i) => `release: ${['MVP', 'Beta', 'v2', 'v3'][i] ?? `v${i + 1}`} @ ${i + 1}`).join('\n');

  return `You are helping to create a user story map for the following product:

${productDescription.trim()}

Generate a story map using the text format below. Return ONLY the story map text — no explanation, no markdown code fences, just the raw text.

---

## Format

\`\`\`
title: <title>

${releaseLines}

activity: <name>
  task: <name>
    story: <text>
    story: <text>
  task: <name>
    story: <text>

activity: <name>
  task: <name>
    story: <text>
\`\`\`

Rules:
- \`activity:\` = a top-level user goal
- \`task:\` = a step within that activity
- \`story:\` = a specific behaviour or feature
- \`release: NAME @ N\` declares a release. Use N = 1, 2, 3... in order — the user will drag the lines to the right position. Just give them sensible names.
- Include exactly ${releaseCount} release line${releaseCount === 1 ? '' : 's'} with positions @ 1${releaseCount > 1 ? `, @ 2` : ''}${releaseCount > 2 ? `, @ 3` : ''}${releaseCount > 3 ? ` ... @ ${releaseCount}` : ''} — do not use any other numbers.

---

## Guidelines

- 3–6 activities covering the full user journey
- 2–4 tasks per activity
- 3–5 stories per task
- Story text short and concrete — under 8 words
- Cover the full journey including error states and secondary flows

---

## Example output (with ${releaseCount} release${releaseCount === 1 ? '' : 's'})

\`\`\`
title: Online Bookshop

${releaseExample}

activity: Discovery
  task: Search
    story: Search by title or author
    story: Filter by genre
    story: See book details
    story: Read customer reviews
  task: Browse
    story: See featured books
    story: Browse by category
    story: View new releases

activity: Purchase
  task: Cart
    story: Add book to cart
    story: View and edit cart
    story: Save cart for later
  task: Checkout
    story: Enter delivery address
    story: Pay by card or PayPal
    story: Receive order confirmation

activity: Account
  task: Orders
    story: View order history
    story: Track delivery status
  task: Wishlist
    story: Save book for later
    story: Move item to cart
\`\`\`

---

Now generate the story map for: ${productDescription.trim()}`;
}
