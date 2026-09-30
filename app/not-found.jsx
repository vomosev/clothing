import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';

export const metadata = {
  title: 'Page not found — MONOLITH',
  description: 'The page you were looking for is no longer part of the MONOLITH archive.',
};

export default function NotFound() {
  return (
    <section className="section">
      <EmptyState
        title="This drop has sold out or moved"
        description="We could not find the page you were after. Pieces rotate out of the archive once a drop closes, but there is always something new on the rails."
        action={
          <div className="cluster">
            <Button href="/shop" variant="primary" size="md">
              Back to the shop
            </Button>
            <Button href="/" variant="ghost" size="md">
              Go to homepage
            </Button>
          </div>
        }
      />
    </section>
  );
}