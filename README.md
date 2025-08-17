# Requirements 

## Description
Name of the app is "valuateur". It allows users to evaluate any stocks globally using different methods. for starting this app only provide Free Cash Flow to Firm (FCFF) method of evaluation, but there should be provision to incorporate other methods as well

## Features
User need to login to use the app. Login can be google login or email login. There will be free version as well as subscription option. Free version will not allow user to store the history of valuation that particular user did in the past. Only last stock valuation detail will be visible. If the free user want to evaluate another stock, then it will override the previous valuation. Whereas subscription user will be able to store the past valuated stocks in differet watchlists. Ther can be maximum of 10 watchlist and 20 stocks per watchlist.

## Data storage requirement
Need to store the following data in the databse for this app
1. user details 
2. Saved valuations in watchlist by the user
3. Some global statistics related to risk premium, country soverein rating, industry statistics - It can be used for valuation, There are currently 5 data tables for FCFF. If there is a change in the value of the field in any of this table, any user used to evaluate using that value should get a notification regarding the update and the effect of it in their valuation.

## Home screen 
Home screen will be the watchlist screen, with side scrolling enabled to scroll to different watchlist. and at the top a search bar for searching stock within the watchlisst. and a settings icon in the right side of the same bar rename the watchlist name or to sort the items in the watchlist. 

For each item in a watchlist, following details will be visible
1. Status dot (red for Expired, orange for any change in the global statistics as mentioned in the Data storage requirement, green for others) with Stock name ticker in bracket (left of the card)
2. Description be the user (left side below Stock name)
3. Valuation result as a numerical value (right side of the card)
4. Current stock price (right side below valuation result)) with % difference from the valuation result. - this has to be fetch from internet using the stock ticker
when the user click on the watchlist card bottum popup will appear with more details, which are-
5. Method of valuation - for example FCFF
6. Date of valuation
7. Expiry date
8. Country & Industry.
9. An edit button in the top right of the card to edit / to duplicate the card also to delete the card

At the bottom right of the screen there shall be a flating round button to add new stock valuation (for free users, it will appear only if they have no saved valuation). When  it clicked, it will expand to different valuation to select from (for strating only FCFF will be available). When FCFF is selected it will goes to FCFF valuation

# FCFF valuation
It will have 4 screens to capture the details of the stocks from the user, some details will be taken fom the global statistics tables.











