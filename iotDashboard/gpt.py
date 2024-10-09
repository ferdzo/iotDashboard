import json

import redis
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()
client = OpenAI()

redis_client = redis.StrictRedis(host='10.10.0.1', port=6379, db=0)

data = redis_client.get("last5").decode("utf-8")


def analysis(environment_data):
    completion = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system",
             "content": "You are an assistant that analyzes environmental data for an office working space and provides "
                        "concise numerical insights."},
            {
                "role": "user",
                "content": f"Analyze the following environmental data. The goal is maintaining optimal working "
                           f"conditions in the office and peak working brain. Focus on any outliers or necessary adjustments. The data is as following: {environment_data}."
                           f"The output should be only the recommendations in numerical form with postitive and negative "
                           f"numbers and also provide small summary in a sentence or two of the current conditions and "
                           f"easily computable in json format. Be consistent with the + and - signs and the summary"
            }
        ],
        response_format={"type": "json_object"}

    )
    output = completion.choices[0].message.content

    return output

output = analysis(data)
redis_client.set("gpt",json.dumps(output))

print(output)
