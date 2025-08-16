# Requirements 

## Description
Name of the app is "valuateur". It allows users to evaluate any stocks globally using different methods. for starting this app only provide Free Cash Flow to Firm (FCFF) method of evaluation, but there should be provision to incorporate other methods as well

## Features
User need to login to use the app. Login can be google login or email login. There will be free version as well as subscription option. Free version will not allow user to store the history of valuation that particular user did in the past. Only last stock valuation detail will be visible. If the free user want to evaluate another stock, then it will override the previous valuation. Whereas subscription user will be able to store the past valuated stocks in differet watchlists. Ther can be maximum of 10 watchlist and 20 stocks per watchlist.

## Home screen 
Home screen will be the watchlist screen, with side scrolling enabled to scroll to different watchlist. and at the top a search bar for searching stock within the watchlisst. and a settings icon in the right side of the same bar rename the watchlist name or to sort the items in the watchlist 

For each item in a watchlist, following details will be visible
1. Status dot (red for Expired and green for others) with Stock name ticker in bracket (left of the card)
2. Description be the user (left side below Stock name)
3. Valuation result as a numerical value (right side of the card)
4. Current stock price (right side below valuation result)) with % difference from the valuation result. - this has to be fetch from internet using the stock ticker
when the user click on the watchlist card bottum popup will appear with more details, which are-
5. Method of valuation - for example FCFF
6. Date of valuation
7. Expiry date
8. Country & Industry.
9. An edit button in the top right of the card to edit the valuation parameters

At the bottom right of the screen there shall be a flating round button to add new stock valuation (for free users, it will appear only if they have no saved valuation). When  it clicked, it will expand to different valuation to select from (for strating only FCFF will be available). When FCFF is selected it will goes to FCFF screeen(1)

## FCFF screeen(1)











