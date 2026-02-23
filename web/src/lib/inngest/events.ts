export type Events = {
  "project/created": {
    data: { projectId: string };
  };
  "project/cleaning.done": {
    data: { projectId: string };
  };
  "project/analysis.done": {
    data: { projectId: string };
  };
  "project/options.done": {
    data: { projectId: string };
  };
  "project/videos.start": {
    data: { projectId: string };
  };
  "project/videos.done": {
    data: { projectId: string };
  };
  "project/render.done": {
    data: { projectId: string };
  };
  "project/triage.confirmed": {
    data: { projectId: string };
  };
  "project/montage.start": {
    data: { projectId: string };
  };
  "replicate/prediction.completed": {
    data: {
      predictionId: string;
      projectId: string;
      predictionType: string;
      roomIndex?: number;
      status: string;
      outputUrl?: string;
      error?: string;
    };
  };
};
