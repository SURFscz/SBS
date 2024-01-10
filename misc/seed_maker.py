from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

client = OpenAI()

completion = client.chat.completions.create(
    model="gpt-3.5-turbo-1106",
    response_format={"type": "json_object"},
    messages=[{
        "role": "system",
        "content": "You are a helpful assistant designed to output JSON."
    },{
        "role": "user",
        "content": """
            Give a list of 10 fantasy names for scientific collaborations.
            Output should be a json list of objects with the fields:
              - display_name
              - short_name
              - description
              - category
              - explanation
            The display name is the full human readable name of the collaboration.
            The short_name is a short abbreviation for the display_name.
            The description explains what the collaboration is about and what
            they intend to achieve.  It is al least 200 words and two paragraphs.
            The category is one or two of the following:
              - classical DND mystical
              - fairytales
              - steampunk
              - science fiction
            The names and descriptions should have hidden jokes and refer to characters or events from the following
            books, tv series and games:
              - Dungeons and Dragons
              - the Lord of the Rings
              - Star Trek the Next Generation
              - Wallace and Gromit
              - Half Life
            But don't use these exact names (or parts of them) in the display name or short name.
            The jokes should be explained in the explanation field.
            A number of the names should refer to horrible experiments done on rabbits; add the mark "konijn" to the
            explanation field for these names.
            Make sure the short names are a maximum of 12 characters long, and only contain alphanumerics and _.
        """
    },{
        "role": "user",
        "content": "For each of the names, explain the side joke"
    }
    ])

print(completion.choices[0].message.content)