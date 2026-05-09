<script lang="ts">
  import { modalState } from '$lib/api/store';

  export let onDismiss: () => void;
  export let onDone: () => void;
</script>

<div
  class="modal-backdrop"
  onclick={(e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target?.classList?.contains('modal-backdrop')) onDismiss();
  }}
  role="presentation"
>
  <div class="modal-content">
    <div class="card">
      <div class="card-header card-header--centered">
        <svg
          class="success-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
        <h3>Success</h3>
      </div>
      <p class="success-message">{$modalState.successMessage}</p>
      <div class="btn-row">
        <button class="btn-primary" onclick={onDone}>Done</button>
      </div>
    </div>
  </div>
</div>

<style>
  .success-icon {
    width: 64px;
    height: 64px;
    color: var(--success);
    animation: scaleIn 0.3s ease-out;
  }

  .btn-row {
    display: flex;
    justify-content: center;
  }

  .btn-primary {
    width: 50%;
    flex: none;
  }

  .success-message {
    color: var(--text-primary);
    text-align: center;
    margin: 0;
    font-size: 1rem;
    line-height: 1.5;
  }

  @keyframes scaleIn {
    from {
      transform: scale(0);
      opacity: 0;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }
</style>
