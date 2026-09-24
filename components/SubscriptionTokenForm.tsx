"use client";

import { useActionState } from "react";
import { PlainButton } from "@/components/plain-button";

type State = { done: boolean; message: string } | null;

// A button that acts on a subscription's token, for the confirm and
// unsubscribe pages; they act only when it's pressed, since mail scanners
// open the links in emails
export default function SubscriptionTokenForm({
  token,
  action,
  label,
  doneDescription,
}: {
  token: string;
  action: (state: State, formData: FormData) => Promise<State>;
  label: string;
  doneDescription: string;
}) {
  const [state, formAction, isPending] = useActionState(action, null);

  if (state?.done) {
    return (
      <>
        <p>{state.message}</p>
        <p className="text-neutral-500">{doneDescription}</p>
      </>
    );
  }

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="token" value={token} />
      <PlainButton type="submit" disabled={isPending}>
        {label}
      </PlainButton>
      {state && <p className="text-red-500">{state.message}</p>}
    </form>
  );
}
