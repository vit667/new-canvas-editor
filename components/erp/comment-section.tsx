"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { EntityComment } from "@/lib/erp/types";

export function CommentSection({
  comments,
  onAddComment
}: {
  comments: EntityComment[];
  onAddComment: (text: string) => void;
}) {
  const [text, setText] = useState("");

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <h3 className="text-sm font-semibold">Комментарии</h3>
      <Textarea
        value={text}
        placeholder="Добавьте комментарий"
        onChange={(event) => setText(event.target.value)}
      />
      <Button
        size="sm"
        onClick={() => {
          const normalized = text.trim();
          if (!normalized) return;
          onAddComment(normalized);
          setText("");
        }}>
        Отправить
      </Button>

      <ScrollArea className="h-36 rounded-md border p-2">
        <div className="space-y-2">
          {comments.length === 0 && <p className="text-muted-foreground text-sm">Комментариев пока нет</p>}
          {comments.map((comment) => (
            <div key={comment.id} className="rounded-md bg-muted/50 p-2 text-sm">
              <p>{comment.text}</p>
              <p className="text-muted-foreground mt-1 text-xs">
                {new Date(comment.createdAt).toLocaleString("ru-RU")}
              </p>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
