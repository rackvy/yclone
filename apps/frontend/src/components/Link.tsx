import { ReactNode, MouseEvent } from 'react';

interface LinkProps {
  href: string;
  children: ReactNode;
  className?: string;
}

export default function Link({ href, children, className = '' }: LinkProps) {
  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    window.history.pushState({}, '', href);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <a href={href} onClick={handleClick} className={className}>
      {children}
    </a>
  );
}
