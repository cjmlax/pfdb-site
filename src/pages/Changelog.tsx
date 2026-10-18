import UpdateFeed from '../components/UpdateFeed';

// Every app update, in a taller and wider version of the home page feed.
export default function Changelog() {
  return (
    <div>
      <h1>Changelog</h1>
      <UpdateFeed className="updates-panel--full" />
    </div>
  );
}
