###### Description ######
# This script will retrieve and output page view information for a single Canvas
# user for the timeframe you specify. Canvas will not return any page view data for
# users that is more than 1 year old
####################################

require 'typhoeus'
require 'csv'
require 'json'
require 'link_header'

######## Edit these Values ########
$canvas_url = "" # Full Canvas domain like: "https://canvas.instructure.com"
$canvas_token = "" # Canvas API Token
$canvas_user_id = "" # user URL = "<canvas_domain>/users/1234" just put "1234"
$start_time = "2019-09-25T13:00:00Z" # Adjust the date and time
$end_time = "2019-09-26T00:00:00Z" # Adjust the date and time
$output_csv = "/Users/jperkins/Downloads/#{$canvas_user_id}_#{$start_time}-#{$end_time}_pageviews.csv" # full file path
####################################

###### Don't edit below here #######

def main()
    request_url = "#{$canvas_url}/api/v1/users/#{$canvas_user_id}/page_views?per_page=100&start_time=#{$start_time}&end_time=#{$end_time}"
    method = "get"
    options = {}
    data = canvasApiRequest(method,request_url,options)
    compiledHash = []
    data.each do |hash|
        hashData = flattenHash(hash)
        compiledHash.push(hashData)
    end
    outputToCSV(compiledHash)
end

#Function to help make Canvas API Calls and deal with pagination etc...
def canvasApiRequest(method,request_url,options)
    puts "Retrieving Data from Canvas"
    parsed_data = []
    more_data = true
    while more_data   # while more_data is true keep looping through the data
        # puts request_url
        request = Typhoeus::Request.new(
            request_url,    #we need a variable here because we need the api url to change
            method: method,
            headers: { authorization: "Bearer #{$canvas_token}" },
            params: options
            )

        request.on_complete do |response|
            #get next link for pagination
                links = LinkHeader.parse(response.headers['Link']).links
                next_link = false
                next_link = links.find { |link| link['rel'] == 'next' } 
                request_url = next_link.href if next_link 
                if next_link && "#{response.body}" != "[]"
                    more_data = true
                else
                    more_data = false
                end
            #ends next link code
            if response.code == 200
                data = JSON.parse(response.body)
                data.each do |info|
                    parsed_data << info
                end
            else
                puts "Something went wrong! Response code was #{response.code} - #{request_url}"
                puts options
            end
            if response.headers['X-Rate-Limit-Remaining'].to_i <= 200
                sleep(0.2)
                puts "Slowing down due to throttling. X-Rate-Limit Remaining = #{response.headers['X-Rate-Limit-Remaining'}"]
            end
        end
        request.run
    end
    return parsed_data
end

# Function to assist writing an array of hashes to csv
def outputToCSV(data)
    puts "Writing Data to #{$output_csv}"
    CSV.open($output_csv, "wb") do |csv|
        csv << data.first.keys
        data.each do |hash|
          csv << hash.values
        end
      end
end

# Flatten the nested data returned by the API call
def flattenHash(hash)
    hash.each_with_object({}) do |(k, v), h|
        if v.is_a? Hash
            flattenHash(v).map do |h_k, h_v|
            h["#{k}.#{h_k}".to_sym] = h_v
            end
        else 
            h[k] = v
        end
    end
end

main()
