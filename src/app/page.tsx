import Finder from '@/components/finder/Finder';

export default function Home() {
  return (
    <main>
      <section id="finder" aria-labelledby="finder-h">
        <div className="wrap">
          <p className="eyebrow">Battery finder</p>
          <h1 className="h2" id="finder-h">
            Find the right battery
          </h1>
          <Finder />
          <p className="find-note">
            <span>Fitment is always confirmed by our team before installation.</span>
          </p>
        </div>
      </section>
    </main>
  );
}
