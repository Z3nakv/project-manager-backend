import { describe, it, expect, vi, beforeEach } from 'vitest';
import { suggestTasksForProject } from '../aiService';
import { ai } from '../../config/gemini';
import { getTasksByProject } from '../taskService';

vi.mock('../../config/gemini', () => ({
  ai: {
    interactions: {
      create: vi.fn(),
    },
  },
}));

vi.mock('../taskService', () => ({
  getTasksByProject: vi.fn(),
}));

describe('suggestTasksForProject', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe parsear y devolver las sugerencias del modelo de IA', async () => {
    vi.mocked(getTasksByProject).mockResolvedValue([]);
    vi.mocked(ai.interactions.create).mockResolvedValue({
      output_text: JSON.stringify([
        { name: 'Tarea sugerida 1', description: 'Desc 1' },
        { name: 'Tarea sugerida 2', description: 'Desc 2' },
      ]),
    } as any);

    const result = await suggestTasksForProject({
      projectId: 'proj-1',
      projectName: 'Proyecto Test',
      projectDescription: 'Una descripción',
      selectedFields: [],
      quantity: 2,
    });

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Tarea sugerida 1');
  });

  it('debe lanzar un error si la IA no devuelve output_text', async () => {
    vi.mocked(getTasksByProject).mockResolvedValue([]);
    vi.mocked(ai.interactions.create).mockResolvedValue({
      output_text: null,
    } as any);

    await expect(
      suggestTasksForProject({
        projectId: 'proj-1',
        projectName: 'Proyecto Test',
        projectDescription: 'Desc',
        selectedFields: [],
        quantity: 3,
      })
    ).rejects.toThrow('La IA no generó una respuesta de texto.');
  });

  it('debe incluir estimatedDays en el schema solo si fue seleccionado', async () => {
    vi.mocked(getTasksByProject).mockResolvedValue([]);
    vi.mocked(ai.interactions.create).mockResolvedValue({
      output_text: JSON.stringify([{ name: 'T', description: 'D', estimatedDays: 3 }]),
    } as any);

    await suggestTasksForProject({
      projectId: 'proj-1',
      projectName: 'Proyecto',
      projectDescription: 'Desc',
      selectedFields: ['estimatedDays'],
      quantity: 1,
    });

    const callArgs = vi.mocked(ai.interactions.create).mock.calls[0][0] as any;
    expect(callArgs.response_format.items.properties).toHaveProperty('estimatedDays');
    expect(callArgs.response_format.items.properties).not.toHaveProperty('labels');
  });

  it('debe incluir labels en el schema solo si fue seleccionado', async () => {
    vi.mocked(getTasksByProject).mockResolvedValue([]);
    vi.mocked(ai.interactions.create).mockResolvedValue({
      output_text: JSON.stringify([{ name: 'T', description: 'D' }]),
    } as any);

    await suggestTasksForProject({
      projectId: 'proj-1',
      projectName: 'Proyecto',
      projectDescription: 'Desc',
      selectedFields: ['labels'],
      quantity: 1,
    });

    const callArgs = vi.mocked(ai.interactions.create).mock.calls[0][0] as any;
    expect(callArgs.response_format.items.properties).toHaveProperty('labels');
    expect(callArgs.response_format.items.properties).not.toHaveProperty('estimatedDays');
  });

  it('debe incluir las tareas existentes del proyecto en el prompt para evitar duplicados', async () => {
    vi.mocked(getTasksByProject).mockResolvedValue([
      { name: 'Tarea Existente A' } as any,
      { name: 'Tarea Existente B' } as any,
    ]);
    vi.mocked(ai.interactions.create).mockResolvedValue({
      output_text: JSON.stringify([{ name: 'Nueva', description: 'Desc' }]),
    } as any);

    await suggestTasksForProject({
      projectId: 'proj-1',
      projectName: 'Proyecto',
      projectDescription: 'Desc',
      selectedFields: [],
      quantity: 1,
    });

    const callArgs = vi.mocked(ai.interactions.create).mock.calls[0][0] as any;
    expect(callArgs.input).toContain('Tarea Existente A');
    expect(callArgs.input).toContain('Tarea Existente B');
  });
});