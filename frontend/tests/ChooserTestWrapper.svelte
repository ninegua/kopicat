<script lang="ts">
  import { clipState, shareState } from '$lib/api/store';
  import { getLocalClip } from '$lib/api/local-store';
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
    onChoose={(clipId) => {
      const clip = getLocalClip(clipId);
      const text = clip?.text ?? '';
      prefillText = text;
      chooserMode = false;
      shareState.set({ prefillText: text });
    }}
  />
{:else}
  <CreateForm
    onCreate={() => {}}
    loading={false}
    enableBrowse={true}
    onBrowseClips={() => {
      chooserMode = true;
    }}
  />
{/if}
