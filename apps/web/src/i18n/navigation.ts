import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

// Always import Link / redirect / usePathname / useRouter from here, never from next/*,
// so the current locale is kept in every URL.
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
