import {
  AZURE_DEPLOYMENT_ID,
  OPENAI_API_HOST,
  OPENAI_API_TYPE,
  OPENAI_API_VERSION,
  OPENAI_ORGANIZATION,
} from '@/utils/app/const';

import { OpenAIModel, OpenAIModelID, OpenAIModels } from '@/types/openai';

export const config = {
  runtime: 'edge',
};

const handler = async (req: Request): Promise<Response> => {
  try {
    const { key } = (await req.json()) as {
      key: string;
    };

    if (OPENAI_API_TYPE === 'azure') {
      const gptModel = OpenAIModels[OpenAIModelID.GPT_4_32K];
      return new Response(JSON.stringify([gptModel]), { status: 200 });
    }

    let url = `${OPENAI_API_HOST}/v1/models`;
    if (OPENAI_API_TYPE === 'azure') {
      url = `${OPENAI_API_HOST}/openai/deployments/${AZURE_DEPLOYMENT_ID}/chat/completions?api-version=${OPENAI_API_VERSION}`;
    }
    const headers = {
      'Content-Type': 'application/json',
      ...(OPENAI_API_TYPE === 'openai' && {
        Authorization: `Bearer ${key ? key : process.env.OPENAI_API_KEY}`,
      }),
      ...(OPENAI_API_TYPE === 'azure' && {
        'api-key': `${key ? key : process.env.OPENAI_API_KEY}`,
      }),
      ...(OPENAI_API_TYPE === 'openai' &&
        OPENAI_ORGANIZATION && {
          'OpenAI-Organization': OPENAI_ORGANIZATION,
        }),
    };
    console.log(url);
    console.log(headers);
    const response = await fetch(url, {
      headers: headers,
      method: 'POST',
    });

    if (response.status === 401) {
      return new Response(response.body, {
        status: 500,
        headers: response.headers,
      });
    } else if (response.status !== 200) {
      console.error(
        `OpenAI API returned an error ${
          response.status
        }: ${await response.text()}`,
      );
      throw new Error('OpenAI API returned an error');
    }

    const json = await response.json();

    const models: OpenAIModel[] = json.data
      .map((model: any) => {
        const model_name = OPENAI_API_TYPE === 'azure' ? model.model : model.id;
        for (const [key, value] of Object.entries(OpenAIModelID)) {
          if (value === model_name) {
            return {
              id: model.id,
              name: OpenAIModels[value].name,
            };
          }
        }
      })
      .filter(Boolean);

    return new Response(JSON.stringify(models), { status: 200 });
  } catch (error) {
    console.error(error);
    return new Response('Error', { status: 500 });
  }
};

export default handler;
