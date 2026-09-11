import { z } from "zod"

export const selectionToolbarCustomActionOutputTypeSchema = z.enum(["string", "number"])
export const selectionToolbarCustomActionOutputFieldSchema = z.object({
  id: z.string().nonempty(),
  name: z.string().trim().min(1),
  type: selectionToolbarCustomActionOutputTypeSchema,
  description: z.string(),
  
})
export const selectionToolbarBuiltInActionStateSchema = z.object({
  enabled: z.boolean(),
  providerId: z.string(),
})
export const selectionToolbarBuiltInActionsSchema = z.object({
  dictionary: selectionToolbarBuiltInActionStateSchema,
})
export const selectionToolbarCustomActionSchema = z.object({
  id: z.string().nonempty(),
  name: z.string().nonempty(),
  enabled: z.boolean().optional(),
  icon: z.string(),
  providerId: z.string(),
  systemPrompt: z.string(),
  prompt: z.string(),
  outputSchema: z.array(selectionToolbarCustomActionOutputFieldSchema).min(1),
}).superRefine((action, ctx) => {
  const names = new Set<string>()
  action.outputSchema.forEach((field, index) => {
    if (names.has(field.name)) ctx.addIssue({ code: "custom", message: 'Duplicate output schema name "' + field.name + '".', path: ["outputSchema", index, "name"] })
    names.add(field.name)
  })
})
export const selectionToolbarCustomActionsSchema = z.array(selectionToolbarCustomActionSchema).superRefine((actions, ctx) => {
  const ids = new Set<string>()
  const names = new Set<string>()
  actions.forEach((action, index) => {
    if (action.id === "default-dictionary") ctx.addIssue({ code: "custom", message: 'Action id "default-dictionary" is reserved for the built-in Dictionary.', path: [index, "id"] })
    if (ids.has(action.id)) ctx.addIssue({ code: "custom", message: 'Duplicate action id "' + action.id + '"', path: [index, "id"] })
    if (names.has(action.name)) ctx.addIssue({ code: "custom", message: 'Duplicate action name "' + action.name + '"', path: [index, "name"] })
    ids.add(action.id)
    names.add(action.name)
  })
})
export type SelectionToolbarCustomActionOutputType = z.infer<typeof selectionToolbarCustomActionOutputTypeSchema>
export type SelectionToolbarCustomActionOutputField = z.infer<typeof selectionToolbarCustomActionOutputFieldSchema>
export type SelectionToolbarBuiltInActionState = z.infer<typeof selectionToolbarBuiltInActionStateSchema>
export type SelectionToolbarBuiltInActions = z.infer<typeof selectionToolbarBuiltInActionsSchema>
export type SelectionToolbarCustomAction = z.infer<typeof selectionToolbarCustomActionSchema>
