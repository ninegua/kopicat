<script lang="ts">
  import { clipState } from '$lib/api/store';
  import CreateForm from '$lib/components/CreateForm.svelte';
  import GridView from '$lib/components/GridView.svelte';

  let chooserMode = $state(false);
  let prefillText = $state<string | null>(null);

  export function getChooserMode() {
    return chooserMode;
  }

  export function getPrefillText() {
    return prefillText;
  }
</script>

{#if chooserMode}
  <GridView
    onChoose={(clip) => {
      prefillText = clip.text;
      chooserMode = false;
      clipState.update((s) => ({ ...s, prefillText: clip.text }));
    }}
  />
{:else}
  <CreateForm
    onCreate={() => {}}
    loading={false}
    onBrowseClips={() => {
      chooserMode = true;
    }}
  />
{/if}
