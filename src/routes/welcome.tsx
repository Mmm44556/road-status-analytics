import { createFileRoute } from '@tanstack/react-router';
import WelcomePage from './-welcome/WelcomePage';

export const Route = createFileRoute('/welcome')({
  component: WelcomePage,
});
