# Instructions

## Overview

My friends and I need a live power ranking website to keep track of all the table tennis matches we play

- For a match just played, there needs to be an add button that allows a user to add:
- Players in the match (singles only matches so 2 max players per match) (also give option to create a new players)
- Match score, differentiating from games up until 11 and games up until 21. Allow scores that go beyond this as players need to win by 2 clear points

- Every match should be numbered 1 - 100+  as a unique id

- There should be a main overall ranking of all the top 5 players
- The website should display the last 5 recent matches, who played against who and who won. 
- The ranking should also have a table with every player and their wins and losses, differentiating from games up until 11 and games up until 21.

## UI Design

- Should be a responsive design across desktop and mobile
- Follow Apple's liquid glass design principles to get started
- Give an option for light / dark mode - choose light mode as default

## Development tools

- Use Next.js and Vercel for frontend / backend
- Will be deployed on Vercel free tier as a simple webapp from a GitHub repo 
- Needs to be hosted online so anyone can access the website with a URL
- Data needs to be stored so a database should be used. Use Vercel products such as Vercel marketplace

## Architecture

- There should be a separate admin page which anybody can access with the right password. Password will be: tabletennis
- Here they can remove names, update scores etc.
