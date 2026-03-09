import { Request } from "express";

const noop = {
  summary(_: string) { return this; },
  action(_: string) { return this; },
  resource(_: string, __: string) { return this; },
  metadata(_: Record<string, any>) { return this; },
  step(_: string) { return this; },
};

export const audit = (req?: Request) => {
  if (!req?.audit) return noop;

  return {
    summary(text: string) {
      req.audit!.summary = text;
      return this;
    },
    action(name: string) {
      req.audit!.action = name;
      return this;
    },
    resource(type: string, id: string) {
      req.audit!.resource = { type, id };
      return this;
    },
    metadata(data: Record<string, any>) {
      req.audit!.metadata = { ...req.audit!.metadata, ...data };
      return this;
    },
    step(action: string) {
      req.audit!.steps.push({ time: new Date(), action });
      return this;
    },
  };
};