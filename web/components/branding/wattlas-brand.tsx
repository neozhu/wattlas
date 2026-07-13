import Link from "next/link";

type Props = {
  href?: string;
};

export function WattlasBrand({ href }: Props) {
  return (
    <div className="brand-block">
      {href ? (
        <Link className="wordmark" href={href} aria-label="Wattlas home">
          WATTLAS
        </Link>
      ) : (
        <div className="wordmark" aria-label="Wattlas">WATTLAS</div>
      )}
      <a
        className="project-byline"
        href="https://github.com/ad1tyagupta/wattlas"
        target="_blank"
        rel="noreferrer"
        aria-label="Open source project by Aditya Gupta"
      >
        An open source project by Aditya Gupta
      </a>
    </div>
  );
}
