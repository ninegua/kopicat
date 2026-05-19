<script lang="ts">
  import Header from '$lib/components/Header.svelte';
  import Footer from '$lib/components/Footer.svelte';

  interface FAQItem {
    question: string;
    answer: string;
  }

  const faqs: FAQItem[] = [
    {
      question: 'What is KopiCat?',
      answer:
        'KopiCat is a secure clipboard sharing app built on the Internet Computer (ICP). It lets you share text, links, and notes with anyone using a simple link — no accounts or sign-ups required. Your data is encrypted client-side before being transported, ensuring only the intended recipient can read it.',
    },
    {
      question: 'How do I share a clip?',
      answer:
        'Tap the "New clip" button (or use the "Or choose from saved clips" option on the home screen). Enter your text and tap "Send". You will receive a shareable link that you can send via any messaging app, email, or QR code. Anyone with the link can view the clip.',
    },
    {
      question: 'How do I receive a clip?',
      answer:
        'When someone shares a clip with you, open the link on your device. The app will automatically fetch and decrypt the clip. You can also scan a QR code using the "Scan QR" option in the menu to start receiving.',
    },
    {
      question: 'Where are my clips stored?',
      answer:
        'All saved clips are stored locally on your device using browser local storage. They are not uploaded to any cloud server — your clips stay on your device. You can save received clips to your collection for later viewing and editing. Please note that local storage is tied to your browser — if you clear your browser cache and local data, all saved clips will be permanently deleted. We recommend keeping a backup of important clips.',
    },
    {
      question: 'Is my data secure?',
      answer:
        'Yes. Every clip is encrypted on your device before being sent to the ICP network. Only the recipient with the correct decryption key can read the content. So be careful of whom you share the link with.',
    },
    {
      question: 'How long are clips available?',
      answer:
        'Shared clips on the ICP network are available for up to 7 days (or 1 day by default). After that, they are deleted and become inaccessible. We recommend saving important clips to your local collection for long-term access.',
    },
    {
      question: 'Can I edit a received clip?',
      answer:
        'Yes! When you view a received clip, you can edit the text. If you save the edited version, it will be stored locally on your device. This is useful for modifying shared text before saving it.',
    },
    {
      question: 'What can I share with KopiCat?',
      answer:
        'You can share any text content — links, notes, code snippets, passwords, addresses, or any other text. There is a maximum size limit of 1MB per clip. Binary data (images, files) is not supported yet.',
    },
    {
      question: 'Can I share a QR code instead of a link?',
      answer:
        'Yes! Use the "Scan QR" option in the menu to either receive a clip by scanning someone else\'s QR code, or to share your own clip via QR code. This is convenient for in-person sharing.',
    },
  ];

  let openIndex = $state<number | null>(null);

  function toggle(index: number) {
    openIndex = openIndex === index ? null : index;
  }
</script>

<svelte:head>
  <title>KopiCat - FAQ</title>
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
  />
</svelte:head>

<Header linkMode="hide" showMenu={true} />

<main class="app-main">
  <div class="faq-container">
    <div class="faq-header">
      <h1 class="faq-title">Frequently Asked Questions</h1>
      <p class="faq-subtitle">Everything you need to know about KopiCat</p>
    </div>

    <div class="faq-list">
      {#each faqs as faq, index}
        <div class="faq-item">
          <button
            class="faq-question"
            onclick={() => toggle(index)}
            aria-expanded={openIndex === index}
          >
            <span class="faq-question-text">{faq.question}</span>
            <svg
              class="faq-chevron"
              class:faq-chevron-open={openIndex === index}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {#if openIndex === index}
            <div class="faq-answer">
              <p>{faq.answer}</p>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  </div>
</main>

<Footer />

<style>
  .faq-container {
    width: 100%;
    max-width: var(--content-max-width);
    padding: var(--space-md);
  }

  .faq-header {
    text-align: center;
    padding: var(--space-xl) 0 var(--space-lg);
  }

  .faq-title {
    font-size: var(--text-2xl);
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: var(--space-sm);
  }

  .faq-subtitle {
    color: var(--text-muted);
    font-size: var(--text-base);
  }

  .faq-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }

  .faq-item {
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    background: var(--bg-card);
    overflow: hidden;
    transition: box-shadow var(--duration-base);
  }

  .faq-item:hover {
    box-shadow: var(--shadow-sm);
  }

  .faq-question {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: var(--space-md);
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
    font-family: inherit;
    font-size: var(--text-md);
    font-weight: 600;
    color: var(--text-primary);
    gap: var(--space-sm);
    transition: background var(--duration-base);
  }

  .faq-question:hover {
    background: var(--bg-card-hover);
  }

  .faq-question-text {
    flex: 1;
  }

  .faq-chevron {
    width: 18px;
    height: 18px;
    color: var(--text-muted);
    flex-shrink: 0;
    transition: transform var(--duration-slow);
  }

  .faq-chevron-open {
    transform: rotate(180deg);
  }

  .faq-answer {
    padding: 0 var(--space-md) var(--space-md);
    border-top: 1px solid var(--border-color);
    animation: fade-in 0.2s ease;
  }

  .faq-answer p {
    color: var(--text-secondary);
    font-size: var(--text-base);
    line-height: 1.6;
    padding-top: var(--space-md);
  }

  @keyframes fade-in {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
