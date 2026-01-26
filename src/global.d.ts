/// <reference types="@sveltejs/kit" />
/// <reference types="vite" />

// Svelte 5 runes type definitions for IDE support
declare global {
	// These are compiler magic functions, but we declare them here for TypeScript
	function $state<T>(initial?: T): T;
	function $derived<T>(fn: () => T): T;
	function $effect(fn: () => void | (() => void)): void;
	function $props<T>(): T;
}
