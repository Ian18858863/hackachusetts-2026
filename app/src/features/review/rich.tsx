import { Fragment, type ReactNode } from 'react';

/**
 * Renders a translated template whose `{name}` placeholders are React nodes
 * (for example a number in its own styled span), so word order stays in the
 * message and is never built by concatenation.
 */
export function rich(template: string, nodes: Record<string, ReactNode>): ReactNode {
  return template.split(/(\{\w+\})/).map((part, i) => {
    const name = /^\{(\w+)\}$/.exec(part)?.[1];
    if (name !== undefined && Object.prototype.hasOwnProperty.call(nodes, name)) {
      return <Fragment key={i}>{nodes[name]}</Fragment>;
    }
    return part;
  });
}
