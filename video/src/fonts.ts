import { loadFont as loadParkinsans } from '@remotion/google-fonts/Parkinsans';
import { loadFont as loadDancing } from '@remotion/google-fonts/DancingScript';
import { loadFont as loadGeistMono } from '@remotion/google-fonts/GeistMono';

// The site's type: Parkinsans for everything, Dancing Script for the
// signature, Geist Mono for small labels.
export const display = loadParkinsans('normal', { weights: ['500', '600', '700'], subsets: ['latin', 'latin-ext'] }).fontFamily;
export const script = loadDancing('normal', { weights: ['600'], subsets: ['latin'] }).fontFamily;
export const mono = loadGeistMono('normal', { weights: ['400', '500'], subsets: ['latin'] }).fontFamily;
