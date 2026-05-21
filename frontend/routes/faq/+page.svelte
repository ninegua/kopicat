<script lang="ts">
  import Header from '$lib/components/Header.svelte';
  import Footer from '$lib/components/Footer.svelte';

  interface FAQItem {
    question: string;
    answer: string;
  }

  interface FAQCategory {
    title: string;
    items: FAQItem[];
  }

  const faqs: FAQCategory[] = [
    {
      title: 'Getting Started',
      items: [
        {
          question: 'What is KopiCat?',
          answer:
            'KopiCat is a secure clipboard sharing app built on the Internet Computer Protocol (ICP). It lets you share text, links, and notes with anyone using a simple link — no accounts or sign-ups required. Your data is encrypted client-side before being transported, ensuring only the intended recipient can read it.',
        },
        {
          question: 'How do I share a clip?',
          answer:
            'Tap the "Copy from clipboard" button (or use the "New clip" <span class="faq-icon-clip"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-sm"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg></span> button on clip list). Enter your text and tap "Send". You will receive a shareable link that you can send via any messaging app, email, or QR code. Anyone with the link can view the clip.',
        },
        {
          question: 'How do I receive a clip?',
          answer:
            'When someone shares a clip with you, open the link on your device. The app will automatically fetch and decrypt the clip. You can also scan a QR code using the "Scan QR" option in the menu to start receiving.',
        },
      ],
    },
    {
      title: 'Storage & Privacy',
      items: [
        {
          question: 'Where are my clips stored?',
          answer:
            'All saved clips are stored locally on your device using browser local storage. You can save received clips to your collection for later viewing and editing. Please note that local storage is tied to your browser — if you clear your browser cache and local data, all saved clips will be permanently deleted. We recommend keeping a backup of important clips.',
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
      ],
    },
    {
      title: 'Features',
      items: [
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
          question: 'Can I request a clip from others?',
          answer:
            'To request a clip, tap the "To receive" button (or "New receive" <span class="faq-icon-receive"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-sm"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 11 12 15 8 11"/><line x1="12" y1="2" x2="12" y2="15"/></svg></span> button on clip list). This shows a QR code and the person sending you the clip needs to scan it with their device to open an URL to send. Once they send it, your app will automatically display the clip for you.',
        },
      ],
    },
  ];
</script>

<svelte:head>
  <title>KopiCat - FAQ</title>
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
  />
</svelte:head>

<Header showMenu={true} />

<main class="app-main">
  <div class="faq-container">
    <div class="faq-header">
      <h1 class="faq-title">Frequently Asked Questions</h1>
      <p class="faq-subtitle">Everything you need to know about KopiCat</p>
    </div>

    {#each faqs as category}
      <div class="faq-section">
        <h2 class="faq-section-title">{category.title}</h2>
        <div class="faq-section-content">
          {#each category.items as faq}
            <div class="faq-item">
              <h3 class="faq-question-text">{faq.question}</h3>
              <div class="faq-answer">{@html faq.answer}</div>
            </div>
          {/each}
        </div>
      </div>
    {/each}
  </div>
</main>

<Footer />

<style>
  .faq-container {
    width: 100%;
    max-width: 600px;
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

  .faq-section {
    margin-bottom: var(--space-lg);
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    padding: var(--space-md);
    box-shadow: var(--shadow-sm);
  }

  .faq-section-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    padding-top: var(--space-md);
  }

  .faq-section-title {
    font-size: var(--text-md);
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: var(--space-xs);
    padding-bottom: var(--space-md);
    border-bottom: 1px solid var(--accent);
  }

  .faq-item {
    padding: 0 0 var(--space-md) 0;
  }

  .faq-item:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }

  .faq-question-text {
    font-size: var(--text-base);
    color: var(--text-secondary);
    margin-bottom: var(--space-sm);
  }

  .faq-answer {
    color: var(--text-secondary);
    font-size: var(--text-base);
    line-height: 1.6;
  }
</style>
