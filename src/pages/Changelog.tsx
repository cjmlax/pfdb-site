import UpdateFeed from '../components/UpdateFeed';

// Every app update, in a taller and wider version of the home page feed.
export default function Changelog() {
  return (
    <div>
    <div className="flex flex-col gap-4">
      <h1>Changelog</h1>
      <p>This is a collection of app updates as they have been published. The site's worker scrapes for new updates and displays them here, with captured dates and descriptions per platform. You can set a default platform in the settings menu or toggle between on each update. Not every platform got every update, so some updates may only display one applicable platform.</p>
      <p>Information regarding the old Mobage Android app is difficult to find. If you have any information or archival changelogs, please reach out to me once the site Contact page is established.</p>
    </div>
    <br></br>
    <div>
      <UpdateFeed className="updates-panel--full" />
    </div>
    </div>
  );
}
