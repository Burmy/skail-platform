-- SKAIL Seed Templates v1

insert into templates (name, template_type, config_json, is_platform_template)
values
('DIY Starter Workspace', 'workspace', '{"pages":["Start Here","Databases","AI Builder","Templates"],"collections":["Tasks","Notes","Projects"]}', true),
('Agency Starter Workspace', 'workspace', '{"pages":["Home","Clients","Portals","Templates","Agents","Automations","Settings"],"collections":["Clients","Projects","Tasks","Approvals"]}', true),
('Managed Client Portal', 'portal', '{"pages":["Welcome","Onboarding","Approvals","Reports","Activity"],"collections":["Onboarding Steps","Approvals","Reports","Client Activity"]}', true)
on conflict do nothing;

insert into agent_templates (name, description, locked_rules, default_instructions, allowed_actions_json)
values
('Portal Setup Agent', 'Creates starter pages, collections, fields, and onboarding structure.', 'Never expose internal SKAIL data. Never remove system fields. Preview destructive changes first.', 'Use a clear, helpful tone. Ask concise setup questions.', '["create_pages","create_collections","create_fields","create_views","create_widgets"]'),
('Task Organizer Agent', 'Organizes tasks, statuses, reminders, and simple workflows.', 'Only access workspace-scoped tasks. Do not contact external users unless approved.', 'Summarize tasks clearly and keep updates simple.', '["read_records","create_records","update_records","create_reports"]'),
('Report Summary Agent', 'Summarizes reports and dashboard status.', 'Do not fabricate data. If data is missing, say what is missing.', 'Use plain language and action-oriented summaries.', '["read_records","create_reports"]')
on conflict do nothing;
