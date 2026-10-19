// Placeholder — copy to come.
import aboutPhoto from "../assets/about-photo.jpg";

export default function About() {
  return (
    <div>
      <h1>About</h1>
      <div className="flex flex-col gap-5">
      <p>This is an unofficial, searchable database of information for the mobile game <a href="https://nimblebit.com" target="_blank" rel="noopener noreferrer">Pocket Frogs</a>. The data for this site is community-sourced and is open to contributions! No account is needed to peruse or contribute, but certain features that require login are either optional and needed to confirm who you are, or are in place to ensure the site has as quality of data as possible.</p>
      <p>This website is a continuation of my <a href="https://docs.google.com/spreadsheets/d/1TNTK09vM8tlj6BC8haobuWCQvV4qNyDsRYsf-4hXdCc/" target="_blank" rel="noopener noreferrer">Google Spreadsheet</a>, which was as a passion project of mine to explore and improve my spreadsheet and general computer skills. This website is a continuation of that passion, just reframed around database design and application infrastructure. This will remain a free and open project as I don't want it associated with anything other than a passion project. If you'd like to support this site, just stopping by is enough!</p>
      <p>Since this is a personal project, please consider it always a work in progress. I'm happy to take feedback, problem reports, and feature requests, but I won't make promises about functionality or timelines since this isn't a priority for me. I have the ability to post site alerts when I expect things to change/break and will do my best to keep everyone posted.</p>
      <p>A core aspect of this site is that the data is hosted in a database that the site speaks back to for information. This means that, in addition to site changes not affecting data integrity, the information can be much more easily downloaded if you'd like. The site also has regular backups and a high-availability server deployment, so it should be very reliable when working as designed. I am not currently offering API access to the database, though that capability exists and am happy to take requests/ideas for use cases if you have them.</p>
      <p>This site is built with a fully self-hosted infrastructure, including the applications that support it like Teable, Zitadel, and Docker. The only external services in use are the datacenters where my equipment is colocated (to provide better reliability than my home infrastructure) and the login sources for account creation/authentication. Note that the only data stored from those login services are those provided by the service via their basic OAuth/OIDC endpoint - usually email, username/account name, first and last name, and the service's internal ID for you account. The specifics vary between services, but I only keep the bare minimum to establish your identity in my Identity Provider (self-hosted Zitadel).</p>
      <p>Finally, I will caveat that this site was built primarily with AI assistance, though the site does not use any AI within it. I am not a coder by training or passion, and spinning up a proper user interface was the largest hurdle to overcome for making this project work. All data is community-contributed, and calculations/algorithms are hard-coded into the pages and or draw from local stores of data. Any page automation or activity (like submissions) is done by a programmed worker that runs alongside the site and is not an AI agent.</p>
      <p>That being said, I will always prefer proper design and craft when I can get it. Unfortunately, I won't offer any compensation for contributions nor will I make any endorsements or any product/person/etc, but can and will give credit to any contributors however they'd like. If you would like to contribute to this site in any way, please reach out and let me know. Everything from code to artwork to accessibility and design recommendations are open avenues for feedback, and I'm grateful for anyone and everyone who has the time to help out. While this is my own little project, it's primarily in service to the larger Pocket Frogs community and I would love for this to be as useful as it can be to everyone.</p>
      </div>
      <br></br>
      <figure>
      <figcaption className="mt-2 text-sm text-gray-500 italic">
        Thanks for stopping by, say hi to Dutchess on your way out!
      </figcaption>
      <img
        src={aboutPhoto}
        alt="Dutchess taking a nap on the couch cushion."
        className="mt-2 w-full max-w-2xl rounded-lg"
      />
    </figure>
    </div>
  );
}