import {
  docToPlainText,
  plainOffsetToPmPos,
  plainTextToDocJson,
} from "@/lib/lughawi/tiptap/plain-map";
import { Node } from "@tiptap/pm/model";
import { Schema } from "@tiptap/pm/model";
import { describe, expect, it } from "vitest";

// Minimal schema matching TipTap paragraph + text + hardBreak
const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: { content: "inline*", group: "block", parseDOM: [{ tag: "p" }], toDOM: () => ["p", 0] },
    text: { group: "inline" },
    hardBreak: {
      inline: true,
      group: "inline",
      selectable: false,
      parseDOM: [{ tag: "br" }],
      toDOM: () => ["br"],
    },
  },
});

function docFromPlain(text: string) {
  const json = plainTextToDocJson(text);
  return Node.fromJSON(schema, json);
}

describe("tiptap plain-map", () => {
  it("round-trips single line", () => {
    const text = "احمد ساعد على";
    const doc = docFromPlain(text);
    expect(docToPlainText(doc)).toBe(text);
    expect(plainOffsetToPmPos(doc, 0)).toBeGreaterThan(0);
    const mid = plainOffsetToPmPos(doc, 5);
    expect(mid).toBeGreaterThan(0);
  });

  it("maps offsets across hard breaks", () => {
    const text = "سطر\nثاني";
    const doc = docFromPlain(text);
    expect(docToPlainText(doc)).toBe(text);
    const atBreak = plainOffsetToPmPos(doc, 3);
    const after = plainOffsetToPmPos(doc, 4);
    expect(after).toBeGreaterThan(atBreak);
  });
});
