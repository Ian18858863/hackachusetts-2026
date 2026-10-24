import { Fragment, type CSSProperties } from 'react';
import styles from './RevealText.module.css';

type RevealTextProps = {
  text: string;
  /** Delay before the first character, in ms. */
  delay?: number;
};

/**
 * Headline reveal: characters go from blurred to sharp, left to right.
 * Screen readers get the plain text once; the animated characters are hidden.
 * With reduced motion the text simply appears.
 */
export function RevealText({ text, delay = 0 }: RevealTextProps) {
  let index = 0;
  const words = text.split(' ');

  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((word, w) => (
          <Fragment key={w}>
            {w > 0 && ' '}
            <span className={styles.word}>
              {Array.from(word).map((char, c) => {
                const style = { '--i': index++, '--delay': `${delay}ms` } as CSSProperties;
                return (
                  <span key={c} className={styles.char} style={style}>
                    {char}
                  </span>
                );
              })}
            </span>
          </Fragment>
        ))}
      </span>
    </>
  );
}
