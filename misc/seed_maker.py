from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

client = OpenAI()

completion = client.chat.completions.create(
    model="gpt-3.5-turbo-1106",
    #model="gpt-4-turbo",
    response_format={"type": "json_object"},
    max_tokens=2000,
    messages=[{
        "role": "system",
        "content": "You are a helpful assistant designed to output JSON."
    },{
        "role": "user",
        "content": """
            We are developing an online platform that allows researchers to define their online collaborations,
            invite new researchers to the collaboration, and manage the collaboration.  The platform is structured like this:
            The top structure is called an Organisation.  An organisation has admins and managers, contains multiple
            collaborations.  Collaborations belong in exactly one organisation, and have a number of members.  Members
            can be admins or regular members.  Collaborations contain optional groups, whick can have zero or more members,
            comprised of the members an/org admins of the collaboration.

            Organisations are typically universities, research institutes, or medical centers. Collaborations are typically
            research projects, working groups, or clinical trials.  Make sure the names and descriptions reflect this.  The
            display name of organisations should contain a phrase like "University of ..", "Institute for ..",
            "Medical Center of ..", "Advanced School of ..." or similar.

            We need to generate seed data for demo purposes.
            We need to generate a number of organisations and collaborations.

            Organisations should have the following fields:
                - display_name
                - short_name
                - description
                - category
                - explanation
            Collaborations should have the following fields:
                - display_name
                - short_name
                - description
                - users
                - explanation
            User should have the following fields:
                - username
                - email
                - first_name
                - last_name
                - explaination

            The display name is the full human readable name of the collaboration.

            The short_name is a short abbreviation for the display_name; it is maximum of 12 characters long, and only contain
            lower case alphanumerics and underscore.

            The description explains what the collaboration is about and what they intend to achieve.  It is al least 150
            words.  It is written in a professional tone, and should clearly express the goal of the
            scientific collaboration to people not familiar with the field.

            The users field for collaborations list the usernames of user who are members of the collaboration.

            Usernames should be lowercase; they must end with a number, and be a maximum of 12 characters long.  They should
            be unique and should be constructed from the first letter of the first name and the full last name, and a number.

            Email addresses shoudl look real, but must not be routable. They should be in the form of
            "{username}@{domain}.not".

            The explanation is a short explanation of how the name and description relate to the category, and explains any
            inside jokes in the names or description, and explains referenced ot rabbit experiments, if any.  For users,
            it should explain how the character relates to the category.

            All collaborations in an Organisation should have the same category.
            Users should have a randomly assigned category from the list below; their data should refer to a character from
            the catagory.

            The category is exactly one of the following:
              - the Lord of the Rings
              - Star Trek the Next Generation
              - Wallace and Gromit and other Aardman animations
              - Asimov's science fiction universe
              - the Dune novels by Frank Herbert
              - the Star Wars universe
              - the Alien franchise
            But do not use these category name in the display name, short name, or description, not even partially.
            The jokes should be explained in the explanation field.

            At least 1 collaboration in each organisation should refer in its names and description to horrible
            experiments done on rabbits; add the mark "konijn" to the explanation field for these names.

            Users should be randomly assigned to collaborations.  The users field for collaborations should be consistent
            with the generated list of users, so if a user is member of a collaboration, his details must be defined in the
            users list.

            Output should be a json like like this:
            {
                "organisations": [
                    {
                        "display_name": "The Fellowship of the Ring",
                        "short_name": "fellowship",
                        "description": "The Fellowship of the Ring is a group of nine members",
                        "category": "classical",
                        "explanation": "The Fellowship of the Ring is a group of nine members",
                        "collaborations": [
                            {
                                "display_name": "The One Ring",
                                "short_name": "onering",
                                "description": "The One Ring is a powerful ring",
                                "explanation": "The One Ring refers to the ring of power that Sauron created in the Lord of the Rings",
                                "users": ["gandalf"]
                            }
                        ]
                    }
                ],
                users: [
                    {
                        "username": "gandalf",
                        "email": "gandalf@rivendell.net",
                        "first_name": "Gandalf",
                        "last_name": "the Grey",
                        "explanation": "wizard from Lord of the Rings"
                    }
                ]
            }

            Generate seed data for 2 organisations with 3 collaborations each, and 10 users.

        """
    }
    ])

print(completion.choices[0].message.content)