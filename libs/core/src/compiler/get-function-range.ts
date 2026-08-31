import { loadTypeScript, type TsNode } from './load-typescript';

export const getFunctionRange = async (contents: string, name: string): Promise<[number, number]> => {
  // Resolves the project's own TypeScript when it has the compiler API
  // (TS <= 6.x), or falls back to @typescript/typescript6 in TS 7 projects.
  const ts = await loadTypeScript();

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Timeout'));
    }, 100);

    // Create a SourceFile object from the TypeScript code string
    const sourceFile = ts.createSourceFile('temp.ts', contents, ts.ScriptTarget.Latest, true);

    // Define a recursive function to visit nodes
    function visit(node: TsNode) {
      if (ts.isVariableDeclaration(node) && node.name?.getText() === name) {
        const start = node.getStart();
        const end = node.getEnd();
        clearTimeout(timeout);
        resolve([start, end]);
      }

      // Recursively visit child nodes
      node.forEachChild(visit);
    }

    // Start visiting nodes from the root
    visit(sourceFile);
  });
};
