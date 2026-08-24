export interface TemplateForm {
  template_name: string;
  location_id: string;
}

export const EMPTY_TEMPLATE_FORM: TemplateForm = {
  template_name: '',
  location_id: '',
};