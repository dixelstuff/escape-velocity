/** Resolve an explicitly selected profile before applying any hole headwind. */
export function withWordModel(e, id) {
  if(!id || e.word_model===id)return e;
  const model=e.wordModels?.get(id);
  if(!model)throw Error('The selected word model is not loaded. Please select it again.');
  return model;
}
